import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name); // Logger instance

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}


  async register(userDto: RegisterUserDto) {
    const { email, mobile } = userDto;

    const emailExists = await this.userRepository.findOne({ where: { email } });
    if (emailExists) {
      this.logger.warn(`Email already exists: ${email}`);
      throw new ConflictException('Email already exists');
    }

    const mobileExists = await this.userRepository.findOne({ where: { mobile } });
    if (mobileExists) {
      this.logger.warn(`Mobile already exists: ${mobile}`);
      throw new ConflictException('Mobile already exists');
    }


    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const user = this.userRepository.create({ ...userDto, password: hashedPassword });

    await this.userRepository.save(user);
    this.logger.log(`User registered with mobile: ${mobile}`);
    return user;
  }

  
  async login(mobile: string, password: string) {
    const user = await this.userRepository.findOne({ where: { mobile } });

    if (!user) {
      this.logger.warn(`Incorrect mobile number: ${mobile}`);
      throw new BadRequestException('Incorrect mobile number');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    
    if (!passwordMatches) {
      this.logger.warn(`Incorrect password attempt for mobile: ${mobile}`);
      throw new BadRequestException('Incorrect password');
    }

   
    const payload = { userId: user.id };
    const accessToken = this.jwtService.sign(payload); // Sign the payload to generate token

    this.logger.log(`User logged in successfully with mobile: ${mobile}`);
    
    return { accessToken };
  }
}
